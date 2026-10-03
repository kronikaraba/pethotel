import bcrypt from "bcryptjs";

const ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Kullanıcı bulunamadığında da aynı sürede yanıt vermek için kullanılan sahte hash. */
export const DUMMY_HASH = "$2b$10$1t0k3fXqRFt6NZO/p3numuEXoGDoOivmsp1QqeKV.s5ZRhkcijQx6";
