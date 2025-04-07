// web/routes/carriers.js
import express from "express";
import { 
  getCarriers, 
  addCarrier, 
  updateCarrier, 
  deleteCarrier 
} from '../database/models/carrier.js';

const router = express.Router();

// Get all carriers
router.get("/", async (_req, res) => {
  try {
    const carriers = await getCarriers();
    res.json(carriers);
  } catch (error) {
    console.error("Error fetching carriers:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch carriers" 
    });
  }
});

// Add a new carrier
router.post("/", async (req, res) => {
  const { name, price } = req.body;
  
  // Validate input
  if (!name || typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ 
      success: false, 
      error: "Invalid carrier data. Name and price (in cents) are required." 
    });
  }
  
  try {
    await addCarrier(name, parseInt(price, 10));
    const carriers = await getCarriers();
    res.status(200).json({ success: true, carriers });
  } catch (error) {
    // Check for duplicate name constraint violation
    if (error.message.includes('unique') || error.message.includes('duplicate')) {
      return res.status(400).json({ 
        success: false, 
        error: "A carrier with this name already exists" 
      });
    }
    
    console.error("Error adding carrier:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to add carrier" 
    });
  }
});

// Update an existing carrier
router.put("/:name", async (req, res) => {
  const { name } = req.params;
  const { price } = req.body;
  
  // Validate input
  if (typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ 
      success: false, 
      error: "Invalid price. Price (in cents) must be a positive number." 
    });
  }
  
  try {
    const result = await updateCarrier(name, parseInt(price, 10));
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Carrier not found" 
      });
    }
    
    const carriers = await getCarriers();
    res.status(200).json({ success: true, carriers });
  } catch (error) {
    console.error("Error updating carrier:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to update carrier" 
    });
  }
});

// Delete a carrier
router.delete("/:name", async (req, res) => {
  const { name } = req.params;
  
  try {
    const result = await deleteCarrier(name);
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Carrier not found" 
      });
    }
    
    const carriers = await getCarriers();
    res.status(200).json({ success: true, carriers });
  } catch (error) {
    console.error("Error deleting carrier:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to delete carrier" 
    });
  }
});

export default router;