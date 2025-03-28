const { instance } = require("../config/razorpay");
const Course = require("../models/Course");
const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const { courseEnrollmentEmail } = require("../mail/templates/courseEnrollmentEmail");
const { default: mongoose } = require("mongoose");

// capture the payment and initiate the Razorpay order
exports.capturePayment = async (req, res) => {
    // get courseId and UserId
    const { course_id } = req.body;
    // added in middleware - decode
    const userId = req.user.id;
    // validation
    if (!course_id) {
        return res.json(400).json({
            success: false,
            message: "Please provide valid course Id",
        });
    }
    // valid courseDetail
    let course;
    try {
        course = await Course.findById(course_id);
        if (!course) {
            return res.status(400).json({
                success: false,
                message: "Could not find the course",
            });
        }

        // user already paid for the same course
        // change string userId of response to objectId as course objectId is there in User schema
        const uid = new mongoose.Types.ObjectId(userId);
        if (course.studentsEnrolled.includes(uid)) {
            return res.status(200).json({
                success: false,
                message: "Student is already enrolled",
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
    // order create
    const amount = course.price;
    const currency = "INR";

    const options = {
        amount: amount * 100, // multiply by 100 - syntax of razorpay
        currency,
        receipt: Math.random(Date.now()).toString(),
        notes: {
            courseId: course_id,
            userId,
        }
    };

    try {
        // initiate the payment using razorpay
        const paymentResponse = await instance.orders.create(options);
        console.log(paymentResponse);
        // return response
        return res.status(200).json({
            success: true,
            courseName: course.courseName,
            courseDescription: course.courseDescription,
            thumbnail: course.thumbnail,
            orderId: paymentResponse.id, // used for tracking the order
            currency: paymentResponse.currency,
            amount: paymentResponse.amount,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

