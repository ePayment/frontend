using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace ePayment.Plugin.Controllers
{
    public class HomeController : Controller
    {
        public ActionResult Merchant(string request)
        {
            if (!String.IsNullOrEmpty(request))
            {
                try
                {
                    dynamic _request = JObject.Parse(request);
                    //dynamic _profile = Business.Customer.GetCustomer(long.Parse(_request.customer_id.ToString()));
                    //string _auth = _request.auth;
                    //string _eauth = Common.Security.CreateHMACSHA256(String.Join("|", _request.data.order.id, _request.data.order.total_amount, _request.customer_id, _request.data.order.merchant_name)
                    //    , _profile.api_key.ToString());
                    //if (_auth != _eauth) return RedirectToAction("Error", new { ErrorMessage = "Sai tham số kết nối" });
                    //ViewBag.profile = _profile;
                    //ViewBag.order = _request.data.order;
                    return View();
                }
                catch { }
            }
            return RedirectToAction("Error", new { ErrorMessage = "Sai tham số kết nối" });

        }
        public ActionResult Error(string ErrorMessage)
        {
            ViewBag.ErrorMessage = ErrorMessage;
            return View();
        }
    }
}