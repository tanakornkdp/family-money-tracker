import { z } from "zod";

type Locale = "th" | "en";
export function validateRegistration(email: string, password: string, confirmation: string) {
  if (!z.email().safeParse(email.trim()).success) return "invalid_email";
  if (password.length < 6) return "short_password";
  if (password !== confirmation) return "password_mismatch";
  return null;
}

// Email OTP length is configurable in Supabase (6–10 digits); never parse as a number.
export function normalizeOtp(value: string) { return value.replace(/[^0-9]/g, "").slice(0, 10); }
export function isValidOtp(value: string) { return /^[0-9]{6,10}$/.test(value); }

export function registrationErrorMessage(error: unknown, locale: Locale) {
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  const thai = locale === "th";
  switch (code) {
    case "otp_expired": case "otp_disabled":
      return thai ? "รหัสไม่ถูกต้องหรือหมดอายุ กรุณาตรวจสอบหรือขอรหัสใหม่" : "The code is invalid or expired. Check it or request a new code.";
    case "over_email_send_rate_limit": case "over_request_rate_limit":
      return thai ? "ส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่" : "Too many requests. Please wait before trying again.";
    case "email_address_not_authorized": case "email_provider_disabled":
      return thai ? "ระบบยังส่งอีเมลไปยังที่อยู่นี้ไม่ได้ กรุณาติดต่อผู้ดูแลเพื่อตั้งค่าระบบส่งเมล" : "Email delivery is not available for this address. Please contact the administrator.";
    case "email_exists": case "user_already_exists":
      return thai ? "ไม่สามารถสมัครด้วยอีเมลนี้ได้ กรุณาเข้าสู่ระบบหรือลืมรหัสผ่าน" : "Unable to register this email. Try signing in or resetting your password.";
    case "weak_password":
      return thai ? "รหัสผ่านไม่ผ่านข้อกำหนด กรุณาใช้รหัสที่ยาวและคาดเดายากขึ้น" : "This password does not meet the requirements. Use a longer, stronger password.";
    default:
      return thai ? "ดำเนินการไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่" : "Unable to complete the request. Check your connection and try again.";
  }
}
