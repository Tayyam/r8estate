// Email templates for the application

/**
 * HTML template for OTP verification emails
 * Contains placeholders:
 * - {{otp}} - The OTP code
 * - {{companyName}} - The name of the company being claimed
 * - {{year}} - The current year for copyright
 */
export const OTP_TEMPLATE_HTML = `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - R8 Estate</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap');
        body {
            font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f9fafb;
            color: #1f2937;
            line-height: 1.5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.05);
        }
        .header {
            background-color: #194866;
            color: white;
            padding: 24px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
        }
        .header p {
            margin: 8px 0 0 0;
            opacity: 0.9;
        }
        .content {
            padding: 32px 24px;
            background-color: #ffffff;
        }
        .otp-container {
            background-color: #f3f4f6;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
            margin: 24px 0;
        }
        .otp-code {
            font-family: monospace;
            font-size: 32px;
            font-weight: 700;
            letter-spacing: 4px;
            color: #194866;
        }
        .note {
            background-color: #fffbeb;
            border-left: 4px solid #f59e0b;
            padding: 12px 16px;
            margin: 24px 0;
            border-radius: 4px;
            font-size: 14px;
        }
        .footer {
            background-color: #f9fafb;
            padding: 16px 24px;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
        }
        .logo {
            font-weight: bold;
            margin-bottom: 16px;
        }
        .logo span:first-child {
            color: #EE183F;
        }
        .logo span:last-child {
            color: white;
        }
        .button {
            display: inline-block;
            background-color: #194866;
            color: white;
            padding: 12px 24px;
            margin: 16px 0;
            text-decoration: none;
            font-weight: 600;
            border-radius: 6px;
        }
        
        /* Arabic text */
        .ar-text {
            direction: rtl;
            text-align: right;
            font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <span>R8</span><span>ESTATE</span>
            </div>
            <h1>Verify Your Email</h1>
            <p>Complete your company claim request</p>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>You're one step away from claiming <strong>{{companyName}}</strong> on R8 Estate. Please use the verification code below to verify your email address.</p>
            
            <div class="otp-container">
                <p>Your verification code:</p>
                <div class="otp-code">{{otp}}</div>
            </div>
            
            <p>Enter this code on the verification page to continue with the company claim process.</p>
            
            <div class="note">
                <p>This code will expire in <strong>60 minutes</strong>. If you did not request this code, please ignore this email.</p>
            </div>
            
            <p>Thank you,<br>The R8 Estate Team</p>
            
            <!-- Arabic version -->
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
            <div class="ar-text">
                <p>مرحباً،</p>
                <p>أنت على بعد خطوة واحدة من المطالبة بشركة <strong>{{companyName}}</strong> على منصة R8 Estate. يرجى استخدام رمز التحقق أدناه للتحقق من عنوان بريدك الإلكتروني.</p>
                
                <p>رمز التحقق الخاص بك:</p>
                <p>{{otp}}</p>
                
                <p>أدخل هذا الرمز في صفحة التحقق للمتابعة مع عملية المطالبة بالشركة.</p>
                
                <p>سينتهي هذا الرمز خلال <strong>60 دقيقة</strong>. إذا لم تطلب هذا الرمز، يرجى تجاهل هذا البريد الإلكتروني.</p>
                
                <p>شكراً لك،<br>فريق R8 Estate</p>
            </div>
        </div>
        <div class="footer">
            <p>© {{year}} R8 Estate. All rights reserved.</p>
            <p>This email was sent to verify your identity. Please do not reply.</p>
        </div>
    </div>
</body>
</html>
`;