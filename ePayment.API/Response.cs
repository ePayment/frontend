using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ePayment.API
{
    public class Response
    {
        public string ResponseCode { get; set; }
        public string ResponseMessage { get; set; }

        public bool IsError { get { return ResponseCode.Equals("00"); } }
    }

    public class Request
    {
        public string FunctionCode { get; set; }
        public string RequestData { get; set; }
    }
}
