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
            string _email, _full_name, _mobile;
            _email = RegisterRequest.email;
            _full_name = RegisterRequest.full_name;
            _mobile = RegisterRequest.mobile;

            ///Workflow
            ///- Kiểm tra đã tồn tại hay chưa: email, mobile
            ///- Tạo mật khẩu ngẫu nhiên
            ///- Cập nhật vào dữ liệu và gửi thông báo qua email

            return new JObject();
        }
    }
}
