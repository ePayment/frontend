using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.ServiceModel;
using System.Text;

namespace ePayment.API
{
    // NOTE: You can use the "Rename" command on the "Refactor" menu to change the class name "Portal" in both code and config file together.
    public class Portal : IPortal
    {
        public Response Process(Request request)
        {
            request.FunctionCode = request.FunctionCode.ToLower();
            switch (request.FunctionCode)
            {
                case "register":
                    return new Response { ResponseCode = "96", ResponseMessage = "Tính năng chưa được hỗ trợ" };
                    break;
                case "login":
                    return new Response { ResponseCode = "96", ResponseMessage = "Tính năng chưa được hỗ trợ" };
                    break;
                case "change_password":
                    return new Response { ResponseCode = "96", ResponseMessage = "Tính năng chưa được hỗ trợ" };
                    break;
                default:
                    return new Response { ResponseCode = "96", ResponseMessage = "Tính năng chưa được hỗ trợ" };
            }
        }

        public User Login(string strUserName, string strPassword)
        {
            return null;
        }

        public bool Register(string strUserName, string strPassword)
        {
            return false;
        }

        public bool ChangePassword(string strOldPassword, string strNewPassword)
        {
            return false;
        }

    }
}
