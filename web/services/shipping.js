// web/services/shipping.js

/**
 * Calculate shipping rates based on order weight and carrier pricing
 * @param {Object} request - The rate request from Shopify
 * @param {Array} carriers - Available shipping carriers with pricing
 * @returns {Array} - Sorted array of shipping rates
 */
export async function calculateShippingRates(request, carriers) {
    // Sum up total weight (in grams)
    const totalWeightGrams = request.rate.items.reduce(
      (acc, item) => acc + item.grams * item.quantity,
      0
    );
  
    // Convert grams to kg
    const totalWeightKg = totalWeightGrams / 1000;
    const maxParcelWeight = 31.5; // Maximum weight per parcel in kg
    
    // Calculate number of parcels needed (round up)
    const parcels = Math.ceil(totalWeightKg / maxParcelWeight);
    
    console.log(`Order weight: ${totalWeightKg}kg, requires ${parcels} parcel(s)`);
  
    // Build rates for each carrier
    const rates = carriers.map((carrier) => ({
      service_name: `${carrier.name} (${parcels} parcel${parcels > 1 ? "s" : ""})`,
      service_code: carrier.name.toLowerCase(),
      total_price: carrier.price * parcels, // price is in cents, e.g. 1000 => €10
      currency: request.rate.currency || "EUR", // Use store's currency or default to EUR
      min_delivery_date: new Date(Date.now() + 1 * 86400000).toISOString(), // Tomorrow
      max_delivery_date: new Date(Date.now() + 5 * 86400000).toISOString(), // 5 days from now
      description: `Delivery via ${carrier.name}, split into ${parcels} parcel(s)`,
    }));
  
    // Sort rates by price (ascending)
    return rates.sort((a, b) => a.total_price - b.total_price);
  }
  
  /**
   * Split products into multiple parcels based on weight constraints
   * @param {Array} items - Order items with weights
   * @param {Number} maxWeight - Maximum weight per parcel in kg
   * @returns {Array} - Array of parcels with assigned items
   */
  export function splitIntoParcel(items, maxWeight = 31.5) {
    // Convert maxWeight from kg to grams
    const maxWeightGrams = maxWeight * 1000;
    
    // Sort items by weight (descending) to optimize bin packing
    const sortedItems = [...items].sort((a, b) => 
      (b.grams * b.quantity) - (a.grams * a.quantity)
    );
    
    const parcels = [];
    let currentParcel = { items: [], weight: 0 };
    
    // Distribute items across parcels
    for (const item of sortedItems) {
      const itemWeight = item.grams * item.quantity;
      
      // If item fits in current parcel, add it
      if (currentParcel.weight + itemWeight <= maxWeightGrams) {
        currentParcel.items.push(item);
        currentParcel.weight += itemWeight;
      } else {
        // If current parcel has items, finalize it and start a new one
        if (currentParcel.items.length > 0) {
          parcels.push(currentParcel);
          currentParcel = { items: [], weight: 0 };
        }
        
        // Special case: single item exceeds max weight
        if (itemWeight > maxWeightGrams) {
          // Split the oversized item into multiple parcels
          const itemParcelsNeeded = Math.ceil(itemWeight / maxWeightGrams);
          for (let i = 0; i < itemParcelsNeeded; i++) {
            parcels.push({
              items: [{ ...item, quantity: 1 }],
              weight: item.grams
            });
          }
        } else {
          // Add item to the new parcel
          currentParcel.items.push(item);
          currentParcel.weight += itemWeight;
        }
      }
    }
    
    // Add the last parcel if it has items
    if (currentParcel.items.length > 0) {
      parcels.push(currentParcel);
    }
    
    return parcels;
  }