const Course = require("../models/Course");
const Category = require("../models/Category");
const User = require("../models/User");
const { uploadImageToCloudinary } = require("../utils/imageUploader");

exports.createCourse = async (req, res) => {
    try {
        // fetch data
        const { courseName, courseDescription, whatYouWillLearn, price, tag, category, status, instructions } = req.body; // category is id in course schema

        // get thumbnail image from request files
        const thumbnail = req.files.thumbnailImage;

        // validation
        if (!courseName || !courseDescription || !whatYouWillLearn || !price || !tag || !thumbnail || !category) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }
        if (!status || status === undefined) {
            status = "Draft";
        }

        // check for instructor by getting object id from db(other method) using user id of intsructor is there in req body used in middleware(other method)
        const userId = req.user.id; // user.decode in user in middleware
        const instructorDetails = await User.findById(userId, {
            accountType: "Instructor",
        });
        console.log("Instructor Details: ", instructorDetails);

        if (!instructorDetails) {
            return res.status(404).json({
                success: false,
                message: "Instructor Details not found",
            });
        }

        // check given category is valid or not - get object id of category, user id of category in req body
        const categoryDetails = await Category.findById(category);
        if (!categoryDetails) {
            return res.status(404).json({
                success: false,
                message: "Category Details not found",
            });
        }

        // upload Image to Cloudinary
        const thumbnailImage = await uploadImageToCloudinary(thumbnail, process.env.FOLDER_NAME);

        // create an entry for new Course
        // in course - instructor id is stored so required that so db call above is used
        const newCourse = await Course.create({
            courseName,
            courseDescription,
            instructor: instructorDetails._id,
            whatYouWillLearn,
            price,
            tag: tag,
            category: categoryDetails._id, // or req body also have this
            thumbnail: thumbnailImage.secure_url,
            status: status,
            instructions: instructions,
        });

        // add the new course to the user schema of Instructor
        await User.findByIdAndUpdate(
            { _id: instructorDetails._id },
            {
                $push: {
                    courses: newCourse._id,
                }
            },
            { new: true },
        );

        // update the Category schema also
        await Category.findByIdAndUpdate(
            { _id: tagDetails._id },
            {
                $push: {
                    courses: newCourse._id,
                }
            },
            { new: true },
        );

        // return response
        return res.status(200).json({
            success: true,
            message: "Course created successfully",
            data: newCourse,
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to created course",
            error: error.message,
        });
    }
};


// getAllCourses handler function

exports.showAllCourses = async (req, res) => {
    try {
        const allCourses = await Course.find(
            {},
            {
                courseName: true,
                price: true,
                thumbnail: true,
                instructor: true,
                ratingAndReviews: true,
                studentsEnrolled: true,
            }).populate("instructor").exec();
        return res.status(200).json({
            success: true,
            message: "Data for courses fetched successfully",
            data: allCourses,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch course data",
            error: error.message,
        });
    }
}

// getAllCourseDetails
exports.getCourseDetails = async (req, res) => {
    try {
        // get id
        const { courseId } = req.body;

        // find complete course details - nested populate
        const courseDetails = await Course.find(
            { _id: courseId })
            .populate(
                {
                    path: "instructor", // instructor is user and additionalDetails id(Profile id) is in user
                    populate: {
                        path: "additionalDetails",
                    },
                }
            )
            .populate("category")
            .populate("ratingAndReviews")
            .populate(
                {
                    path: "courseContent", // courseContent is Section and subSection Id is there in Section
                    populate: {
                        path: "subSection",
                    },
                }
            )
            .exec();
        // validation
        if (!courseDetails) {
            return res.status(400).json({
                success: false,
                message: `Could not find the course with ${courseId}`,
            });
        }
        // return response
        return res.status(200).json({
            success: false,
            message: "Course Details fetched successfully",
            data: courseDetails,
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}