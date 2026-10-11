namespace JewelryApp.User;

public partial class PersonalInfoPage : ContentPage
{
    public PersonalInfoPage()
    {
        InitializeComponent();
    }

    private async void OnBackButtonClicked(object sender, EventArgs e)
    {
        await Navigation.PopAsync();
    }
}