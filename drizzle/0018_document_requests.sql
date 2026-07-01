CREATE TABLE IF NOT EXISTS "document_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "customer_id" text NOT NULL,
  "requested_types" text NOT NULL,
  "token" text NOT NULL UNIQUE,
  "status" text NOT NULL DEFAULT 'PENDING',
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "document_requests_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "customer_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "customer_id" text NOT NULL,
  "request_id" uuid,
  "document_type" text NOT NULL,
  "file_path" text NOT NULL,
  "uploaded_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "customer_documents_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "customer_documents_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."document_requests"("id") ON DELETE set null ON UPDATE no action
);
