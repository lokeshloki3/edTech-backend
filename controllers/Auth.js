const User = require("../models/User");
const OTP = require("../models/OTP");
const otpGenerator = require("otp-generator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// sendOTP
exports.sendOTP = async (req, res) => {
    try {
        // fetch email from req body
        const { email } = req.body;

        // check if user already exist
        const checkUserPresent = await User.findOne({ email });

        // if user already exist, then return a response
        if (checkUserPresent) {
            return res.status(401).json({
                success: false,
                message: "User already registered",
            })
        }

        // generate otp
        var otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
        });
        console.log("OTP generated", otp);

        // check unique otp or not or we can use library which will auto give unique otp everytime
        let result = await OTP.findOne({ otp: otp });

        while (result) {
            var otp = otpGenerator.generate(6, {
                upperCaseAlphabets: false,
                lowerCaseAlphabets: false,
                specialChars: false,
            });
            result = await OTP.findOne({ otp: otp });
        }

        const otpPayload = { email, otp };

        // create an entry in db for OTP
        const otpBody = await OTP.create(otpPayload);
        console.log(otpBody);

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
            otp,
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        })
    }
}

// signUp
exports.singUp = async (req, res) => {

    try {
        // data fetch from req body
        const {
            firstName,
            lastName,
            email,
            password,
            confirmPassword,
            accountType,
            contactNumber,
            otp
        } = req.body;

        // validate data
        if (!firstName || !lastName || !email || !password || !confirmPassword || !otp) {
            return res.status(403).json({
                success: false,
                message: "All fields required",
            })
        }

        // 2 password match
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Password and Confirm Password does not match",
            });
        }

        // check user already exist or not
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User is already registered"
            });
        }

        // find most recent OTP stored for the user
        const recentOtp = await OTP.find({ email }).sort({ createdAt: -1 }).limit(1);
        console.log(recentOtp);

        // validate OTP
        if (recentOtp.length == 0) {
            // otp not found
            return res.status(400).json({
                success: false,
                message: "OTP not found"
            })
        } else if (otp !== recentOtp.otp) {
            // invalid otp
            return res.status(400).json({
                success: false,
                message: "OTP not matching",
            });
        }

        // hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // entry create in db
        const profileDetails = await Profile.create({
            gender: null,
            dateOfBirth: null,
            about: null,
            contactNumber: null,
        })

        const user = await User.create({
            firstName,
            lastName,
            email,
            contactNumber,
            password: hashedPassword,
            accountType,
            additionalDetails: profileDetails._id,
            image: `http://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`, // dice bear api
        })

        // return res
        return res.status(200).json({
            success: true,
            message: "User is registered successfully",
            user,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: true,
            message: "User cannot be registered. Please try again",
        });
    }
}

// Login
exports.login = async (req, res) => {
    try {
        // get data from req body
        const { email, password } = req.body;

        // validate data
        if (!email || !password) {
            return res.status(400).json({
                success: true,
                message: "All fields required",
            });
        }

        // user check exist or not
        // const user = await User.findOne({ email }).populate("additionalDetails");
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: true,
                message: "User is not registered, please signup first",
            });
        }

        // generate JWT, after password matching
        if (await bcrypt.compare(password, user.password)) {
            const payload = {
                email: user.email,
                id: user._id,
                accountType: user.accountType,
            }
            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn: "2h",
            });
            user.token = token;
            user.password = undefined;

            // create cookie and send response
            const options = {
                expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
                httpOnly: true,
            }
            res.cookie("token", token, options).status(200).json({
                success: true,
                token,
                user,
                message: "Logged in successfully",
            })
        }
        else {
            return res.status(401).json({
                success: true,
                message: "Password is incorrect",
            })
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: true,
            message: "Login failed, please try again",
        });
    }
}

// changePassword
exports.changePassword = async (req, res) => {
    try {
        // get data from req body
    const {oldPassword, newPassword , confirmPassword} = req.body;
    // get oldPassword, newPassword, confirmPassword
    const password = await User.findOne({email});
    // validation
    if(!oldPassword || !newPassword || !confirmPassword){
        return res.status(400).json({
            success: false,
            message: "All fields are required",
        });
    }

    // update password in db

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.findOneAndReplace({email: email},{password: hashedPassword},{new:true})
    // send email - Password updated
    await mailSender(
        email,
        "Password Updated successfully",
        "Password Updated successfully"
    );
    //  return response
    } catch (error) {
        
    }
}