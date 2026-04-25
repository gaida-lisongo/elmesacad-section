export type MailAccountRow = {
  email: string;
  maildir: string;
};

export type ListMailAccountsResponse = {
  ok: true;
  rows: MailAccountRow[];
};

export type CreateMailAccountResponse = {
  ok: true;
  status: string;
  account: MailAccountRow;
};

export type UpdateMailAccountResponse = {
  ok: true;
  updated: boolean;
};

export type DeleteMailAccountResponse = {
  ok: true;
  deleted: boolean;
};

export type MailAccountExistsResponse = {
  ok: true;
  exists: boolean;
  email: string;
};

export type AccountServiceErrorBody = {
  ok: false;
  code: string;
  message: string;
};

export type MailAccountsActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };
