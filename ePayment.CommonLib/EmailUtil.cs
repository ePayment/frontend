using System;
using System.Data;
using System.Configuration;
using System.Web;
using System.Net;
using System.Net.Mail;

namespace ePayment.CommonLib
{
    public class EmailUtil
    {
          
        #region Properties...

        private string _sMailServer;
        private string _sUser;
        private string _sPassword;
        private string _sSendFrom;
        private string _sSendTo;
        private string _sCc;
        private string _sBcc;
        private string _sSubject;
        private string _sBody;
        private string _sAttachmentPath;
        private int    _iPort;

        public string AttachmentPath
        {
            get { return _sAttachmentPath; }
            set { _sAttachmentPath = value; }
        }

        public string Smtp
        {
            get { return _sMailServer; }
            set { _sMailServer = value; }
        }
        public int Port
        {
            get { return _iPort; }
            set { _iPort = value; }
        }
        public string User
        {
            get { return _sUser; }
            set { _sUser = value; }
        }
        public string Password
        {
            get { return _sPassword; }
            set { _sPassword = value; }
        }
        public string From
        {
            get { return _sSendFrom; }
            set { _sSendFrom = value; }
        }
        public string To
        {
            get { return _sSendTo; }
            set { _sSendTo = value; }
        }
        public string Cc
        {
            get { return _sCc; }
            set { _sCc = value; }
        }
        public string Bcc
        {
            get { return _sBcc; }
            set { _sBcc = value; }
        }
        public string Subject
        {
            get { return _sSubject; }
            set { _sSubject = value; }
        }
        public string Body
        {
            get { return _sBody; }
            set { _sBody = value; }
        }

        #endregion 

        public EmailUtil(string mailServer, int iPort, string user, string password, string email)
        {
            _sMailServer = mailServer;
            _sUser = user;
            _sPassword = password;
            _sSendFrom = email;
            _iPort = iPort;
        }

        public bool Send()
        {
            try
            {
                MailMessage message = new MailMessage(this.From, this.To, this.Subject, this.Body);
                message.IsBodyHtml = true;
                if (this.Cc != null)
                {
                    message.CC.Add(this.Cc);
                }

                if (this.Bcc != null)
                {
                    message.Bcc.Add(this.Bcc);
                }
                System.Net.Mail.SmtpClient client = default(System.Net.Mail.SmtpClient);
                client = new SmtpClient(this.Smtp);
                client.Port = this.Port;
                client.EnableSsl = true;
                client.DeliveryMethod = System.Net.Mail.SmtpDeliveryMethod.Network;
                client.UseDefaultCredentials = false;
                client.Credentials = new NetworkCredential(this.User, this.Password);
                client.Timeout = 20000;
                client.Send(message);
                return true;
            }
            catch (Exception)
            {
                try
                {
                    MailMessage message = new MailMessage(this.From, this.To, this.Subject, this.Body);
                    if (this.AttachmentPath != null)
                    {
                        Attachment attach = new Attachment(this.AttachmentPath);
                        message.Attachments.Add(attach);
                    }
                    message.IsBodyHtml = true;
                    if (this.Cc != null)
                    {
                        message.CC.Add(this.Cc);
                    }

                    if (this.Bcc != null)
                    {
                        message.Bcc.Add(this.Bcc);
                    }
                    System.Net.Mail.SmtpClient client = default(System.Net.Mail.SmtpClient);
                    client = new SmtpClient(this.Smtp);
                    client.Port = this.Port;
                    client.EnableSsl = true;
                    client.EnableSsl = false;
                    client.DeliveryMethod = System.Net.Mail.SmtpDeliveryMethod.Network;               
                    client.UseDefaultCredentials = true;
                    client.Credentials = new NetworkCredential(this.User, this.Password);                    
                    client.Send(message);
                    return true;
                }
                catch (Exception)
                {
                    throw;
                }
                throw;
            }
        }
    }
}
