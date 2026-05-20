import { z } from 'zod';

/**
 * Password: min 8, 1 upper, 1 lower, 1 number, 1 special char, max 72 (bcrypt limit)
 */
export const passwordSchema = z
  .string()
  .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
  .max(72, '비밀번호는 최대 72자까지 가능합니다')
  .regex(/[A-Z]/, '비밀번호에 대문자가 포함되어야 합니다')
  .regex(/[a-z]/, '비밀번호에 소문자가 포함되어야 합니다')
  .regex(/[0-9]/, '비밀번호에 숫자가 포함되어야 합니다')
  .regex(/[^A-Za-z0-9]/, '비밀번호에 특수문자가 포함되어야 합니다');

/**
 * Email: RFC 5322, lowercase transform
 */
export const emailSchema = z
  .string()
  .email('유효한 이메일 주소를 입력해주세요')
  .transform((val) => val.toLowerCase());

/**
 * Name: Korean/English, 2-20 chars
 */
export const nameSchema = z
  .string()
  .min(2, '이름은 최소 2자 이상이어야 합니다')
  .max(20, '이름은 최대 20자까지 가능합니다')
  .regex(/^[가-힣a-zA-Z\s\-'.]+$/, '이름은 한글, 영문, 공백, 하이픈(-)만 입력 가능합니다');

export const koreanNameSchema = nameSchema;

/**
 * Phone: Korean mobile format (010-XXXX-XXXX)
 */
/**
 * Date: ISO 8601 date string (YYYY-MM-DD)
 */
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '유효한 날짜 형식을 입력해주세요 (YYYY-MM-DD)');

/**
 * Phone: Korean mobile format (010-XXXX-XXXX)
 */
export const phoneSchema = z
  .string()
  .regex(
    /^01[0-9]-\d{3,4}-\d{4}$/,
    '유효한 휴대폰 번호를 입력해주세요 (예: 010-1234-5678)',
  )
  .nullable()
  .optional();
