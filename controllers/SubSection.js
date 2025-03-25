const SubSection = require("../models/SubSection");
const Section = require("../models/Section");

// create SubSection

exports.createSubSection = async (req, res) => {
    try {
        // fetch data from req body
        const { title, timeDuration, description, sectionId } = req.body; // sectionId to update subsection id in section
        // extract file/video
        const video = req.files.videoFile;
        // validation
        if (!title || !timeDuration || !description || !video || !sectionId) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }
        // upload video to Cloudinary - got secure url
        const uploadDetails = await uploadImageToCloudinary(video, process.env.FOLDER_NAME);
        // create a sub-section
        const subSectionDetails = await SubSection.create({
            title: title,
            timeDuration: timeDuration,
            description: description,
            videoUrl: uploadDetails.secure_url,
        });
        // update section with this sub section ObjectId
        const updatedSection = await Section.findByIdAndUpdate({ _id: sectionId },
            {
                $push: {
                    subSection: subSectionDetails._id,
                }
            },
            { new: true }
        );
        // log updated section above, after adding populate here to have subsection details in section instead of id
        // return response
        return res.status(200).json({
            success: true,
            message: "Sub Section created successfully",
            updatedSection,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Unable to create Sub Section, Please try again",
            error: error.message,
        });
    }
}

// update sub section
// delete sub section