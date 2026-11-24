import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { DOCUMENT_TYPES } from '../../platform/storage/document-type.js';
import { ApiDataResponse } from '../../platform/response-envelope.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import type { AuthenticatedUser } from '../auth/sessions.service.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import {
  ExpenseDetailDto,
  ExpenseDto,
  ExpenseLedgerDto,
  ExpenseListDto,
  ExpenseTotalsDto,
} from './dto/expense.dto.js';
import { RecordAdjustmentDto, RecordPaymentDto, ReverseEntryDto } from './dto/ledger-input.dto.js';
import { UpdateExpenseDto } from './dto/update-expense.dto.js';
import { ExpensesService } from './expenses.service.js';
import { ExpenseFilesService } from './expense-files.service.js';
import {
  ExpenseFileDto,
  ExpenseFileUploadDto,
  ExpenseFileUploadRequestDto,
} from './dto/expense-file.dto.js';

/** How a file is handed over: shown when it's a photo, otherwise downloaded under its own name. */
function disposition(name: string, viewable: boolean): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `${viewable ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

const WEDDING_NOT_FOUND = 'WEDDING_NOT_FOUND: not a wedding you belong to.';
const NOT_FOUND = `${WEDDING_NOT_FOUND} EXPENSE_NOT_FOUND: no such expense in it.`;
const ARCHIVED = 'WEDDING_ARCHIVED: the wedding is read-only.';

/**
 * For a wedding's owners and managers; 404 to anyone else, as for every
 * wedding route. Expenses are private and never public. Amounts are paise.
 */
@ApiTags('Expenses')
@ApiCookieAuth('mm_session')
@Controller('weddings/:weddingId')
export class ExpensesController {
  constructor(
    private readonly expenses: ExpensesService,
    private readonly files: ExpenseFilesService,
  ) {}

  /**
   * A form to upload one receipt or document to (decision 0023): a PDF, a
   * photo, or a Word or Excel file, up to 15 MB. Then `…/complete`, then
   * send its ID with the expense, payment, discount, extra or reversal.
   */
  @Post('expense-files')
  @HttpCode(201)
  @ApiOperation({ summary: 'Start a receipt or document upload' })
  @ApiDataResponse(ExpenseFileUploadDto, { status: 201 })
  @ApiNotFoundResponse({ description: WEDDING_NOT_FOUND })
  @ApiConflictResponse({ description: ARCHIVED })
  requestFileUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Body() body: ExpenseFileUploadRequestDto,
  ): Promise<ExpenseFileUploadDto> {
    return this.files.requestUpload(user, weddingId, body);
  }

  /** Checks the uploaded file and keeps it, ready to attach. */
  @Post('expense-files/:fileId/complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Finish a receipt or document upload' })
  @ApiDataResponse(ExpenseFileDto)
  @ApiNotFoundResponse({ description: WEDDING_NOT_FOUND })
  @ApiConflictResponse({ description: ARCHIVED })
  @ApiUnprocessableEntityResponse({
    description: 'UPLOAD_NOT_FOUND, UPLOAD_TOO_LARGE or UPLOAD_WRONG_TYPE.',
  })
  completeFileUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('fileId') fileId: string,
  ): Promise<ExpenseFileDto> {
    return this.files.completeUpload(user, weddingId, fileId);
  }

  /**
   * A receipt or document, for the wedding's members only: photos open in
   * the browser, everything else downloads. Never cached by anyone else.
   */
  @Get('expense-files/:fileId')
  @Header('Cache-Control', 'private, max-age=300')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Content-Security-Policy', "default-src 'none'; img-src 'self'; sandbox")
  @ApiOperation({ summary: 'Open or download a receipt or document' })
  @ApiProduces(...DOCUMENT_TYPES)
  @ApiOkResponse({ description: 'The file.' })
  @ApiNotFoundResponse({ description: 'FILE_NOT_FOUND or WEDDING_NOT_FOUND.' })
  async file(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('fileId') fileId: string,
  ): Promise<StreamableFile> {
    const { file, fileName, viewable } = await this.files.read(user, weddingId, fileId);
    return new StreamableFile(file.body, {
      type: file.contentType,
      length: file.bytes,
      disposition: disposition(fileName, viewable),
    });
  }

  /** The wedding's expenses, soonest due first, with totals over all of them. */
  @Get('expenses')
  @ApiOperation({ summary: 'List expenses' })
  @ApiDataResponse(ExpenseListDto)
  @ApiNotFoundResponse({ description: WEDDING_NOT_FOUND })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<ExpenseListDto> {
    return this.expenses.list(user, weddingId);
  }

  /** Totals across the wedding's expenses, in paise. */
  @Get('expenses-summary')
  @ApiOperation({ summary: 'Get INR paise totals' })
  @ApiDataResponse(ExpenseTotalsDto)
  @ApiNotFoundResponse({ description: WEDDING_NOT_FOUND })
  summary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
  ): Promise<ExpenseTotalsDto> {
    return this.expenses.summary(user, weddingId);
  }

  /** Adds an expense. Name, category and agreed amount are required. */
  @Post('expenses')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create expense in integer paise' })
  @ApiDataResponse(ExpenseDto, { status: 201 })
  @ApiNotFoundResponse({ description: WEDDING_NOT_FOUND })
  @ApiConflictResponse({ description: ARCHIVED })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Body() body: CreateExpenseDto,
  ): Promise<ExpenseDto> {
    return this.expenses.create(user, weddingId, body);
  }

  /** An expense with its paid and outstanding totals and its whole history. */
  @Get('expenses/:expenseId')
  @ApiOperation({ summary: 'Read expense with paid/outstanding totals' })
  @ApiDataResponse(ExpenseDetailDto)
  @ApiNotFoundResponse({ description: NOT_FOUND })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('expenseId') expenseId: string,
  ): Promise<ExpenseDetailDto> {
    return this.expenses.get(user, weddingId, expenseId);
  }

  /** Changes an expense's details. Fields left out stay; `null` clears an optional one. */
  @Patch('expenses/:expenseId')
  @ApiOperation({ summary: 'Update expense amount/details' })
  @ApiDataResponse(ExpenseDto)
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiConflictResponse({ description: ARCHIVED })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('expenseId') expenseId: string,
    @Body() body: UpdateExpenseDto,
  ): Promise<ExpenseDto> {
    return this.expenses.update(user, weddingId, expenseId, body);
  }

  /**
   * Deletes an expense (owners and admins). It is kept, with its whole history,
   * marked as deleted; it leaves the list and the totals.
   */
  @Delete('expenses/:expenseId')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete expense (owners and admins); kept with its history, marked deleted',
  })
  @ApiNoContentResponse({ description: 'The expense is deleted.' })
  @ApiForbiddenResponse({ description: 'ADMIN_REQUIRED: managers cannot delete expenses.' })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiConflictResponse({ description: ARCHIVED })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('expenseId') expenseId: string,
  ): Promise<void> {
    return this.expenses.remove(user, weddingId, expenseId);
  }

  @Get('expenses/:expenseId/payments')
  @ApiOperation({ summary: 'List payment ledger entries' })
  @ApiDataResponse(ExpenseLedgerDto)
  @ApiNotFoundResponse({ description: NOT_FOUND })
  ledger(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('expenseId') expenseId: string,
  ): Promise<ExpenseLedgerDto> {
    return this.expenses.ledger(user, weddingId, expenseId);
  }

  /** Records money paid outside the app; never more than is still owed. */
  @Post('expenses/:expenseId/payments')
  @HttpCode(201)
  @ApiOperation({ summary: 'Record payment' })
  @ApiDataResponse(ExpenseDetailDto, { status: 201 })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiConflictResponse({ description: ARCHIVED })
  recordPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('expenseId') expenseId: string,
    @Body() body: RecordPaymentDto,
  ): Promise<ExpenseDetailDto> {
    return this.expenses.recordPayment(user, weddingId, expenseId, body);
  }

  /** Records a discount the vendor accepted, or an extra such as a bonus (decision 0014). */
  @Post('expenses/:expenseId/adjustments')
  @HttpCode(201)
  @ApiOperation({ summary: 'Record a discount or an extra' })
  @ApiDataResponse(ExpenseDetailDto, { status: 201 })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiConflictResponse({ description: ARCHIVED })
  recordAdjustment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('expenseId') expenseId: string,
    @Body() body: RecordAdjustmentDto,
  ): Promise<ExpenseDetailDto> {
    return this.expenses.recordAdjustment(user, weddingId, expenseId, body);
  }

  /** Undoes a payment, discount or extra by a compensating entry; both stay in the history. */
  @Post('expenses/:expenseId/payments/reverse')
  @HttpCode(201)
  @ApiOperation({ summary: 'Reverse previous payment by compensating entry' })
  @ApiDataResponse(ExpenseDetailDto, { status: 201 })
  @ApiNotFoundResponse({
    description: `${NOT_FOUND} EXPENSE_ENTRY_NOT_FOUND: no such entry in its history.`,
  })
  @ApiConflictResponse({
    description: `${ARCHIVED} ENTRY_ALREADY_REVERSED, ENTRY_NOT_REVERSIBLE, REVERSAL_BELOW_PAID.`,
  })
  reverse(
    @CurrentUser() user: AuthenticatedUser,
    @Param('weddingId') weddingId: string,
    @Param('expenseId') expenseId: string,
    @Body() body: ReverseEntryDto,
  ): Promise<ExpenseDetailDto> {
    return this.expenses.reverse(user, weddingId, expenseId, body);
  }
}
