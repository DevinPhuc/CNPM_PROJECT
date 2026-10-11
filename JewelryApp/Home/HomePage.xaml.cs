namespace JewelryApp.Home;

public partial class HomePage : ContentPage
{
    public HomePage()
    {
        InitializeComponent();
    }
    private async void OnCartClicked(object sender, EventArgs e)
    {
        await Navigation.PushAsync(new CartPage());
    }
}