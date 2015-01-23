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
                    break;
                case "login":
                    break;
                case "change_password":
                    break;
                default:
                    return new Response { ResponseCode = "96", ResponseMessage = "Tính năng chưa được hỗ trợ" };
            }
        }
    }
}
