import { z } from "zod";

export const deleteAccountSchema = z.object({
  email: z
    .string({ error: "メールアドレスを入力してください" })
    .email("メールアドレスの形式で入力してください"),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
