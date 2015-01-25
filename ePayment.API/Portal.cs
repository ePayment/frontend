using Newtonsoft.Json.Linq;
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
        public string Execute(string requestData)
        {
            dynamic request = JObject.Parse(requestData);
            string function_code = request.FunctionCode.ToLower();
            switch (function_code)
            {
                case "register":
                    return Process.Profile.Register(request).ToString();
                case "login":                 
                    break;
                case "change_password":                  
                    break;
                default:
                    return new  JObject(new { ResponseCode = "96", ResponseMessage = "Tính năng chưa được hỗ trợ" }).ToString();
            }
            return new JObject(new { ResponseCode = "96", ResponseMessage = "Tính năng chưa được hỗ trợ" }).ToString();
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
