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
};

// verify Signature of Razorpay and our backend server

exports.verifySignature = async (req, res) => {
    const webhookSecret = "12345678"; // my secret which I have given to Razorpay

    // razorpay hit my backend webhook api and send my secret back to me after successful payment in req - one way encryption
    const signature = req.header["x-razorpay-signature"];

    // as razorpay secret is one way encrypted - we encrypt our secret and verify it with razorpay secret
    const shasum = crypto.createHmac("sha256", webhookSecret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    if (signature === digest) {
        console.log("Payment is Authorised");

        // we have sent it in notes to update it here
        const { courseId, userId } = req.body.payload.payment.entity.notes;

        try {
            // fulfil the action

            // find the course and enroll the student in it
            const enrolledCourse = await Course.findByIdAndUpdate(
                { _id: courseId },
                { $push: { studentsEnrolled: userId } },
                { new: true },
            );

            if (!enrolledCourse) {
                return res.status(500).json({
                    success: false,
                    message: 'Course not Found',
                });
            }

            console.log(enrolledCourse);

            // find the student and add the course to their list enrolled courses
            const enrolledStudent = await User.findByIdAndUpdate(
                { _id: userId },
                { $push: { courses: courseId } },
                { new: true },
            );
            console.log(enrolledStudent);

            // send confirmation mail - will change mailSender util later for html email template
            const emailResponse = await mailSender(
                enrolledStudent.email,
                "Congratulations from edTech",
                "Congratulations, you are onboarded into new edTech Course",
            );

            console.log(emailResponse);
            return res.status(200).json({
                success: true,
                message: "Signature Verified and Course Added",
            });
        }
        catch (error) {
            console.log(error);
            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }
    else {
        return res.status(400).json({
            success: false,
            message: 'Invalid request',
        });
    }
};