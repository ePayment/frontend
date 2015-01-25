using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.ServiceModel;
using System.Text;

namespace ePayment.API
{
    // NOTE: You can use the "Rename" command on the "Refactor" menu to change the interface name "IPortal" in both code and config file together.
    [ServiceContract]
     interface IPortal
    {
        [OperationContract]
         Response Process(Request request);

        [OperationContract]
        User Login(string strUserName, string strPassword);

        [OperationContract]
        bool Register(string strUserName, string strPassword);

        [OperationContract]
        bool ChangePassword(string strOldPassword, string strNewPassword);  

    }
}
