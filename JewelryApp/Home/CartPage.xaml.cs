namespace JewelryApp.Home;

public partial class CartPage : ContentPage
{
    int qty1 = 1;
    int qty2 = 1;
    long price1 = 12500000;
    long price2 = 8200000;

    bool isSelected1 = true;
    bool isSelected2 = true;

    public CartPage()
    {
        InitializeComponent();
        UpdateTotal();
    }

    private async void OnBackButtonClicked(object sender, EventArgs e)
    {
        await Navigation.PopAsync();
    }

    private void OnCheck1Changed(object sender, CheckedChangedEventArgs e)
    {
        isSelected1 = e.Value;
        UpdateTotal();
    }

    private void OnCheck2Changed(object sender, CheckedChangedEventArgs e)
    {
        isSelected2 = e.Value;
        UpdateTotal();
    }

    private void OnMinus1Clicked(object sender, EventArgs e)
    {
        qty1--;
        if (qty1 <= 0)
        {
            Product1Container.IsVisible = false;
            qty1 = 0;
            isSelected1 = false;
        }
        else
        {
            Qty1Label.Text = qty1.ToString();
        }
        UpdateTotal();
    }

    private void OnPlus1Clicked(object sender, EventArgs e)
    {
        qty1++;
        Qty1Label.Text = qty1.ToString();
        UpdateTotal();
    }

    private void OnTrash1Clicked(object sender, EventArgs e)
    {
        Product1Container.IsVisible = false;
        qty1 = 0;
        isSelected1 = false;
        UpdateTotal();
    }

    private void OnMinus2Clicked(object sender, EventArgs e)
    {
        qty2--;
        if (qty2 <= 0)
        {
            Product2Container.IsVisible = false;
            qty2 = 0;
            isSelected2 = false;
        }
        else
        {
            Qty2Label.Text = qty2.ToString();
        }
        UpdateTotal();
    }

    private void OnPlus2Clicked(object sender, EventArgs e)
    {
        qty2++;
        Qty2Label.Text = qty2.ToString();
        UpdateTotal();
    }

    private void OnTrash2Clicked(object sender, EventArgs e)
    {
        Product2Container.IsVisible = false;
        qty2 = 0;
        isSelected2 = false;
        UpdateTotal();
    }

    private void UpdateTotal()
    {
        long total = 0;
        int totalItems = 0;

        if (isSelected1 && qty1 > 0)
        {
            total += (qty1 * price1);
            totalItems += qty1;
        }

        if (isSelected2 && qty2 > 0)
        {
            total += (qty2 * price2);
            totalItems += qty2;
        }

        string formattedTotal = string.Format("{0:N0}đ", total).Replace(",", ".");

        HeaderCountLabel.Text = $"{totalItems} sản phẩm";
        BottomTotalLabel.Text = formattedTotal;

        OrderButton.Text = $"Đặt hàng ({totalItems})";

        if (totalItems == 0)
        {
            OrderButton.IsEnabled = false;
            OrderButton.BackgroundColor = Colors.LightGray;
        }
        else
        {
            OrderButton.IsEnabled = true;
            OrderButton.BackgroundColor = Color.FromArgb("#B08920");
        }
    }
    private async void OnOrderButtonClicked(object sender, EventArgs e)
    {
        await Navigation.PushAsync(new CheckoutPage());
    }
}