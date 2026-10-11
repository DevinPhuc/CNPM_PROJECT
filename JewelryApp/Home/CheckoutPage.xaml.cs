namespace JewelryApp.Home;

public partial class CheckoutPage : ContentPage
{
    public CheckoutPage()
    {
        InitializeComponent();
    }

    private async void OnBackButtonClicked(object sender, EventArgs e)
    {
        await Navigation.PopAsync();
    }

    private void OnPay1Tapped(object sender, EventArgs e)
    {
        Dot1.IsVisible = true;
        Outer1.Stroke = Color.FromArgb("#B08920");

        Dot2.IsVisible = false;
        Outer2.Stroke = Color.FromArgb("#CCCCCC");

        Dot3.IsVisible = false;
        Outer3.Stroke = Color.FromArgb("#CCCCCC");
    }

    private void OnPay2Tapped(object sender, EventArgs e)
    {
        Dot1.IsVisible = false;
        Outer1.Stroke = Color.FromArgb("#CCCCCC");

        Dot2.IsVisible = true;
        Outer2.Stroke = Color.FromArgb("#B08920");

        Dot3.IsVisible = false;
        Outer3.Stroke = Color.FromArgb("#CCCCCC");
    }

    private void OnPay3Tapped(object sender, EventArgs e)
    {
        Dot1.IsVisible = false;
        Outer1.Stroke = Color.FromArgb("#CCCCCC");

        Dot2.IsVisible = false;
        Outer2.Stroke = Color.FromArgb("#CCCCCC");

        Dot3.IsVisible = true;
        Outer3.Stroke = Color.FromArgb("#B08920");
    }
}