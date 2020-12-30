$("#coupon").submit(async function (event) {
    event.preventDefault();
    let formData = $("#coupon").serializeArray();
    axios.post("/api/checkCoupon", { data: formData }).then((request) => {
        let data = request.data;
        if (data.success) {
            let name = $("#" + $("#price")[0].value)[0]
                .text.replace("$", "")
                .split(" ");
            $("#appliedCoupon").val(data.price + " " + data.coupon);
            $("#applied").css("display", "block");
            $("#error").css("display", "none");
            if (name[0] == "Lifetime") {
                $("#purchaseButton").text("Purchase for $" + ((parseFloat(name[2]) / 100) * (100 - parseFloat(data.price))).toFixed(2));
            } else {
                $("#purchaseButton").text("Purchase for $" + ((parseFloat(name[3]) / 100) * (100 - parseFloat(data.price))).toFixed(2));
            }
        } else {
            $("#applied").css("display", "none");
            $("#error").css("display", "block");
        }
    });
    return false;
});
$(document).ready(function () {
    let name = $("#" + $("#price")[0].value)[0]
        .text.replace("$", "")
        .split(" ");
    if (name[0] == "Lifetime") {
        $("#purchaseButton").text("Purchase for $" + name[2]);
    } else {
        $("#purchaseButton").text("Purchase for $" + name[3]);
    }
});
$("#price").change(function () {
    let name = $("#" + $("#price")[0].value)[0]
        .text.replace("$", "")
        .split(" ");
    let coupon = $("#appliedCoupon")[0].value.split(" ");
    if (coupon == "") {
        if (name[0] == "Lifetime") {
            $("#purchaseButton").text("Purchase for $" + name[2]);
        } else {
            $("#purchaseButton").text("Purchase for $" + name[3]);
        }
    } else {
        if (name[0] == "Lifetime") {
            $("#purchaseButton").text("Purchase for $" + ((parseFloat(name[2]) / 100) * (100 - parseFloat(coupon[0]))).toFixed(2));
        } else {
            $("#purchaseButton").text("Purchase for $" + ((parseFloat(name[3]) / 100) * (100 - parseFloat(coupon[0]))).toFixed(2));
        }
    }
});
