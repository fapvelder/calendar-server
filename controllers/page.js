import { PageModel } from "../models/page.js";

export const getPageByLanguage = async (req, res) => {
  try {
    const { language } = req.query;

    // Find the page(s) by language
    const page = await PageModel.findOne({ language });

    // If no page is found for the specified language, return all pages
    if (!page) {
      const allPages = await PageModel.find({});
      if (allPages.length === 0) {
        return res.status(404).json({ message: "No pages found" });
      }
      return res.status(200).json({ pages: allPages });
    }

    res.status(200).json({ page });
  } catch (error) {
    res.status(500).json({ message: "Error fetching page by language", error });
  }
};

export const createPage = async (req, res) => {
  try {
    const { language, sections } = req.body;
    const page = new PageModel({ language, sections });
    await page.save();
    res.status(201).json({ message: "Page created successfully", page });
  } catch (error) {
    res.status(500).json({ message: "Error creating page", error });
  }
};
export const updatePage = async (req, res) => {
  try {
    const { id } = req.params;
    const { language, sections } = req.body;

    const page = await PageModel.findById(id);
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    page.language = language;
    page.sections = sections;

    await page.save();

    res.status(200).json({ message: "Page updated successfully", page });
  } catch (error) {
    res.status(500).json({ message: "Error updating page", error });
  }
};
