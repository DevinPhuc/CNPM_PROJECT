namespace JewelryApp.User;

public partial class ChangePassword : ContentPage
{
    public ChangePassword()
    {
        InitializeComponent();
    }
    private async void OnBackButtonClicked(object sender, EventArgs e)
    {
        await Navigation.PopAsync();
    }
}