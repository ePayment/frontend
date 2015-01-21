using Microsoft.Owin;
using Owin;

[assembly: OwinStartupAttribute(typeof(ePayment.Plugin.Startup))]
namespace ePayment.Plugin
{
    public partial class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            ConfigureAuth(app);
        }
    }
}
