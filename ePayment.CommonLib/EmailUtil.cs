using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net.Mail;

namespace ePayment.CommonLib
{
    public class EmailUtil
    {
        public MailAddress EmailTo { get; set; }
        public string EmailCc { get; set; }
        public string EmailBcc { get; set; }
        public MailAddress EmailFrom { get; set; }
        public string EmailSubject { get; set; }
        public string EmailBody { get; set; }

        public void SendEmail()
        {
            MailMessage message = new MailMessage();
            message.To.Add(EmailTo);
            message.CC.Add(EmailCc);
            message.Bcc.Add(EmailBcc);
            message.From = EmailFrom;
            message.Subject = EmailSubject;
            message.Body = EmailBody;

            EmailSender.SendSingle(message);

        }

    }
}
