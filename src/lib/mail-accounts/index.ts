export {
  createAgentMailboxAction,
  createMailAccountAction,
  createStudentMailboxAction,
  deleteMailAccountAction,
  listMailAccountsAction,
  agentMailboxExistsAction,
  studentMailboxExistsAction,
  mailAccountExistsAction,
  updateMailAccountAction,
} from "./actions";
export {
  createMailAccount,
  createAgentMailAccount,
  createStudentMailAccount,
  mailAccountExists,
  mailAccountExistsAgent,
  mailAccountExistsStudent,
  listMailAccounts,
  listMailAccountsForAudience,
} from "./client";
export type { MailServiceAudience } from "./audience";
export { resolveMailAccountPasswordScheme } from "./audience";
export type {
  AgentMailAccountCreatePayload,
  StudentMailAccountCreatePayload,
  AdminMailAccountCreatePayload,
  MailAccountWireCreateBody,
} from "./payloads";
export {
  MAIL_ACCOUNT_PASSWORD_MAX_LENGTH,
  buildAgentMailAccountPayload,
  buildStudentMailAccountPayload,
  buildAdminMailAccountPayload,
  serializeAgentMailAccountForApi,
  serializeStudentMailAccountForApi,
  serializeAdminMailAccountForApi,
} from "./payloads";
export type { MailAccountRow, MailAccountsActionResult, MailAccountExistsResponse } from "./types";
