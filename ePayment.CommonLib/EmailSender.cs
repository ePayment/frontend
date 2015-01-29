using System;
using System.Collections.Generic;
using System.Web;
using System.Net.Mail;

namespace ePayment.CommonLib
{
     public class EmailSender: IDisposable
    {
        	#region Attributes
		private SmtpClient _smtp = null;
		#endregion

		#region Properties
		private SmtpClient Smtp
		{
			get
			{
				if(_smtp == null)
					_smtp = new SmtpClient();
				return _smtp;
			}
		}
		#endregion

		#region Constructors
		public EmailSender()
		{
		}
		#endregion

		#region Methods
		public SendResult Send(MailMessage email)
		{
			var result = new SendResult();

			try
			{
				Smtp.Send(email);
				result.Success = true;
				result.SuccessCount = 1;
			}
			catch (Exception ex)
			{
				result.Success = false;                
			}

			return result;
		}

		public SendResult Send(MailMessage email, IEnumerable<MailAddress> recipients)
		{
			var result = new SendResult();

			foreach (var recip in recipients)
			{
				try
				{
					email.To.Clear();
					email.To.Add(recip);

					Smtp.Send(email);

					result.SuccessCount++;

				}
				catch (Exception)
				{
					result.FailCount++;
				}
			}

			result.Success = result.SuccessCount > 0;
			return result;
		}

		public void Dispose()
		{
			if (_smtp != null)
			{
				Smtp.Dispose();
			}
		}
		#endregion

		#region Static methods
		public static SendResult SendSingle(MailMessage msg)
		{
			var result = new SendResult();

			using(var sender = new EmailSender())
			{
				result = sender.Send(msg);
			}

			return result;
		}
		#endregion
	}

	public class SendResult
	{
		public bool Success { get; set; }
		public int SuccessCount { get; set; }
		public int FailCount { get; set; }
	}
 }

