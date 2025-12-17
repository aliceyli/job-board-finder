// TO-DO: figure out how to validate request body input 
// using something like 
// zod 
// express-validator (middleware-base)
// joi/yup (schema-based)

export interface Company {
  id: number;
  name: string;
  slug: string;
  board: string;
  board_url: string;
  created_at: Date;
  updated_at: Date;
}

export type CreateCompanyInput = Omit<
  Company,
  "id" | "created_at" | "updated_at"
>;
