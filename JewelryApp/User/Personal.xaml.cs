namespace JewelryApp.User;

public partial class Personal : ContentPage
{
    public Personal()
    {
        InitializeComponent();
    }
    private async void OnPersonalInfoTapped(object sender, EventArgs e)
    {
        await Navigation.PushAsync(new PersonalInfoPage());
    }

    private async void OnChangePasswordTapped(object sender, EventArgs e)
    {
        await Navigation.PushAsync(new ChangePassword());
    }
    private void OnLogoutClicked(object sender, EventArgs e)
    {
        MainThread.BeginInvokeOnMainThread(async () =>
        {
            bool answer = await DisplayAlert("Xác nhận", "Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?", "Đồng ý", "Hủy");
            if (answer)
            {
                await DisplayAlert("Thông báo", "Đăng xuất thành công!", "OK");
            }
        });
    }
}