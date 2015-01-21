namespace ePayment.API.Service
{
    partial class ProjectInstaller
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary> 
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Component Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.apiServiceInstallerProcess = new System.ServiceProcess.ServiceProcessInstaller();
            this.apiServiceInstaller = new System.ServiceProcess.ServiceInstaller();
            // 
            // apiServiceInstallerProcess
            // 
            this.apiServiceInstallerProcess.Account = System.ServiceProcess.ServiceAccount.LocalSystem;
            this.apiServiceInstallerProcess.Password = null;
            this.apiServiceInstallerProcess.Username = null;
            // 
            // apiServiceInstaller
            // 
            this.apiServiceInstaller.Description = "ePayment API Service";
            this.apiServiceInstaller.DisplayName = "ePayment API";
            this.apiServiceInstaller.ServiceName = "ePaymentApiService";
            this.apiServiceInstaller.StartType = System.ServiceProcess.ServiceStartMode.Automatic;
            // 
            // ProjectInstaller
            // 
            this.Installers.AddRange(new System.Configuration.Install.Installer[] {
            this.apiServiceInstallerProcess,
            this.apiServiceInstaller});

        }

        #endregion

        private System.ServiceProcess.ServiceProcessInstaller apiServiceInstallerProcess;
        private System.ServiceProcess.ServiceInstaller apiServiceInstaller;
    }
}