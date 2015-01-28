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
                     return Process.Profile.Login(request).ToString();
                case "change_password":
                     return Process.Profile.ChangePassword(request).ToString();
                default:
                    return new  JObject(new { ResponseCode = "96", ResponseMessage = "Tính năng chưa được hỗ trợ" }).ToString();
            }           
        }
    }
}
