namespace JewelryApp.Menu;

public partial class NotificationsPage : ContentPage
{
    // Biến trạng thái để theo dõi người dùng đang ở Tab nào
    private bool isUnreadTabSelected = true;
    private bool isAllRead = false; // Trạng thái đã đọc hết chưa

    public NotificationsPage()
    {
        InitializeComponent();
    }
    private void OnTabAllTapped(object sender, EventArgs e)
    {
        isUnreadTabSelected = false;

        TabAllFrame.BackgroundColor = Colors.White;
        TabAllText.TextColor = Color.FromArgb("#D4AF37");

        TabUnreadFrame.BackgroundColor = Colors.Transparent;
        TabUnreadText.TextColor = Color.FromArgb("#888888");

        FilterNotifications();
    }

    private void OnTabUnreadTapped(object sender, EventArgs e)
    {
        isUnreadTabSelected = true;

        TabUnreadFrame.BackgroundColor = Colors.White;
        TabUnreadText.TextColor = Color.FromArgb("#D4AF37");

        TabAllFrame.BackgroundColor = Colors.Transparent;
        TabAllText.TextColor = Color.FromArgb("#888888");

        FilterNotifications();
    }
    private void OnReadAllTapped(object sender, EventArgs e)
    {
        isAllRead = true;

        Dot1.IsVisible = false;
        Dot2.IsVisible = false;
        Dot3.IsVisible = false;

        BadgeUnreadFrame.IsVisible = false;

        Notif1.BorderColor = Color.FromArgb("#EFEFEF");

        FilterNotifications();
    }

    private void FilterNotifications()
    {
        if (isUnreadTabSelected && isAllRead)
        {
            Notif1.IsVisible = false;
            Notif2.IsVisible = false;
            Notif3.IsVisible = false;
        }
        else
        {
            Notif1.IsVisible = true;
            Notif2.IsVisible = true;
            Notif3.IsVisible = true;
        }
    }
}