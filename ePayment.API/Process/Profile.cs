using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ePayment.API.Process
{
    public class Profile
    {
        /// <summary>
        /// Hàm đăng ký tài khoản
        /// </summary>
        /// <param name="RegisterRequest">
        /// Request chứa các thông tin như sau:
        /// + Email đăng ký
        /// + Họ và tên
        /// + Số điện thoại di động
        /// </param>
        /// <returns></returns>
        public static dynamic Register(dynamic RegisterRequest)
        {
            string _email, _full_name, _mobile, _username, _password;
            _email = RegisterRequest.email;
            _full_name = RegisterRequest.full_name;
            _mobile = RegisterRequest.mobile;
            _username = RegisterRequest.username;
            ///Workflow
            ///- Kiểm tra đã tồn tại hay chưa: email, mobile
           ///- Tạo mật khẩu ngẫu nhiên
            if (!CheckUser(_username))
                _password = CreatePassword();
            ///Nếu tồn tại thì phải trả ra kết quả luôn, nếu để như hiện tại thì luôn tạo user
            ///- Cập nhật vào dữ liệu và gửi thông báo qua email
            Create_NewUser(RegisterRequest, _password);
            return new JObject();
        }
        public static bool CheckUser(string _username)
        {
            //loginDB, neu co thi tra ve true, ko thi tra ve false
            return false;
        }

        public static string CreatePassword()
        { 
            //tao mat khau ngau nhien
            return string.Empty;
        }
        public static string Create_NewUser(dynamic RegisterRequest, string password)
        {
            //insert newuser into Db
            return "00";
        }
        public static bool Login(dynamic RegisterRequest)
        {
            return true;
        }

        public static dynamic Register(dynamic RegisterRequest)
        {
            return new JObject();
        }

        public static dynamic ChangePassword(dynamic RegisterRequest)
        {
            return new JObject();
        }
    }
}
