export type MailAccountRow = {
  id: number;
  email: string;
  domain_id: number;
  domain_name: string;
};

export type ListMailAccountsResponse = {
  ok: true;
  rows: MailAccountRow[];
};

export type MailAccountDetailResponse = {
  ok: true;
  user: MailAccountRow;
};

export type CreateMailAccountResponse = {
  ok: true;
  status: string;
  id: number;
  user: {
    email: string;
    domain: string;
  };
};

export type UpdateMailAccountResponse = {
  ok: true;
  updated: boolean;
  id: number;
};

export type DeleteMailAccountResponse = {
  ok: true;
  deleted: boolean;
  id: number;
};

export type MailAccountExistsResponse = {
  ok: true;
  exists: boolean;
  email: string;
};

export type AccountServiceErrorBody = {
  ok: false;
  code?: string;
  message: string;
};

export type MailAccountsActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };
