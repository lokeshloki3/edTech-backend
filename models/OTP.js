const mongoose = require('mongoose');
const mailSender = require('../utils/mailSender');

const OTPSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    otp: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now(),
        expires: 5 * 60, // 5 min
    },
});

// a function -> to send emails pre save middleware hook to be sent before DB entry of actual Data
async function sendVerificationEmail(email, otp) {
    try {
        const mailResponse = await mailSender(email, "Verification OTP from edTech", otp);
        console.log("Email sent successfully: ", mailResponse);
    } catch (error) {
        console.log("Error occured while sending mails: ", error);
        throw error;
    }
}

// OTP pre save middleware added before OTP exports as pre hook
OTPSchema.pre("save", async function (next) {
    await sendVerificationEmail(this.email, this.otp);
    next(); // Move to next middleware
})

mongoose.exports = mongoose.model("OTP", OTPSchema);