using Microsoft.Owin;
using Owin;

[assembly: OwinStartupAttribute(typeof(ePayment.Portal.Startup))]
namespace ePayment.Portal
{
    public partial class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            ConfigureAuth(app);
        }
    }
}
