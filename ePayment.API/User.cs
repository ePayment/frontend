using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Runtime.Serialization;

namespace ePayment.API
{
    public class User
    {
        [DataMember]
        public int ID;

        [DataMember]
        public string UserName;

        [DataMember]
        public string Password;

    }
}
