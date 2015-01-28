using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.ServiceModel;
using System.Text;

namespace ePayment.API
{
    /// Comment của HUY
    /// - Viết cái prototype hàm Execute để tham khảo mà không có xài
    /// - Prototype là phải viết luôn prototype của quá trình xử lý trong hàm chứ không có nghĩa là return false luôn
    /// - 3 ngày cho cái đống shit này
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
    }
}
