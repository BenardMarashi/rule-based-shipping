import { useState, useCallback, useEffect } from "react";
import {
  Page,
  Layout,
  Card,
  ResourceList,
  ResourceItem,
  Text,
  TextField,
  Button,
  ButtonGroup,
  FormLayout,
  Banner,
  Modal,
  Loading,
  Frame,
  Toast,
  Icon,
  InlineStack,
  BlockStack,
  Box,
} from "@shopify/polaris";
import { DeleteIcon, EditIcon } from "@shopify/polaris-icons";
import { useAuthenticatedFetch } from "../hooks";

export default function Carriers() {
  const fetch = useAuthenticatedFetch();
  const [carriers, setCarriers] = useState([]);
  const [newCarrier, setNewCarrier] = useState({ name: "", price: "" });
  const [editCarrier, setEditCarrier] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toastActive, setToastActive] = useState(false);
  const [toastContent, setToastContent] = useState("");
  const [errorBanner, setErrorBanner] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [carrierToDelete, setCarrierToDelete] = useState(null);

  // Load carriers on component mount
  useEffect(() => {
    fetchCarriers();
  }, []);

  const fetchCarriers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/carriers");
      if (response.ok) {
        const data = await response.json();
        setCarriers(data);
      } else {
        const error = await response.text();
        setErrorBanner(`Failed to load carriers: ${error}`);
      }
    } catch (error) {
      setErrorBanner(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [fetch]);

  const handleNameChange = useCallback(
    (value) => setNewCarrier({ ...newCarrier, name: value }),
    [newCarrier]
  );

  const handlePriceChange = useCallback(
    (value) => {
      // Only allow numbers and format as currency
      const numericValue = value.replace(/[^0-9]/g, "");
      setNewCarrier({ ...newCarrier, price: numericValue });
    },
    [newCarrier]
  );

  const handleEditNameChange = useCallback(
    (value) => setEditCarrier({ ...editCarrier, name: value }),
    [editCarrier]
  );

  const handleEditPriceChange = useCallback(
    (value) => {
      // Only allow numbers
      const numericValue = value.replace(/[^0-9]/g, "");
      setEditCarrier({ ...editCarrier, price: numericValue });
    },
    [editCarrier]
  );

  const handleAddCarrier = useCallback(async () => {
    if (!newCarrier.name || !newCarrier.price) {
      setErrorBanner("Carrier name and price are required");
      return;
    }

    const priceInCents = parseInt(newCarrier.price, 10);
    if (isNaN(priceInCents) || priceInCents <= 0) {
      setErrorBanner("Price must be a positive number");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/carriers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newCarrier.name,
          price: priceInCents,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Reset form and show success toast
        setNewCarrier({ name: "", price: "" });
        setToastContent(`Carrier "${newCarrier.name}" added successfully`);
        setToastActive(true);
        fetchCarriers();
      } else {
        setErrorBanner(`Failed to add carrier: ${data.error}`);
      }
    } catch (error) {
      setErrorBanner(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [fetch, newCarrier]);

  const handleUpdateCarrier = useCallback(async () => {
    if (!editCarrier || !editCarrier.name || !editCarrier.price) {
      return;
    }

    const priceInCents = parseInt(editCarrier.price, 10);
    if (isNaN(priceInCents) || priceInCents <= 0) {
      setErrorBanner("Price must be a positive number");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/carriers/${editCarrier.name}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          price: priceInCents,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setToastContent(`Carrier "${editCarrier.name}" updated successfully`);
        setToastActive(true);
        setEditCarrier(null);
        fetchCarriers();
      } else {
        setErrorBanner(`Failed to update carrier: ${data.error}`);
      }
    } catch (error) {
      setErrorBanner(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [fetch, editCarrier]);

  const handleDeleteCarrier = useCallback(async () => {
    if (!carrierToDelete) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/carriers/${carrierToDelete.name}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        setToastContent(`Carrier "${carrierToDelete.name}" deleted successfully`);
        setToastActive(true);
        fetchCarriers();
      } else {
        setErrorBanner(`Failed to delete carrier: ${data.error}`);
      }
    } catch (error) {
      setErrorBanner(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
      setCarrierToDelete(null);
      setDeleteModalOpen(false);
    }
  }, [fetch, carrierToDelete]);

  const confirmDelete = useCallback((carrier) => {
    setCarrierToDelete(carrier);
    setDeleteModalOpen(true);
  }, []);

  const dismissToast = useCallback(() => setToastActive(false), []);

  const dismissErrorBanner = useCallback(() => setErrorBanner(""), []);

  const formatPrice = (priceInCents) => {
    return (priceInCents / 100).toLocaleString("de-DE", {
      style: "currency",
      currency: "EUR",
    });
  };

  // Render loading UI
  if (isLoading && carriers.length === 0) {
    return (
      <Frame>
        <Loading />
        <Page title="Shipping Carriers" />
      </Frame>
    );
  }

  return (
    <Frame>
      {isLoading && <Loading />}
      {toastActive && (
        <Toast content={toastContent} onDismiss={dismissToast} />
      )}

      <Page
        title="Shipping Carriers"
        subtitle="Configure the carriers and prices for your rule-based shipping calculator"
      >
        <BlockStack gap="4">
          {errorBanner && (
            <Banner status="critical" onDismiss={dismissErrorBanner}>
              {errorBanner}
            </Banner>
          )}

          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="4">
                  <Box padding="4">
                    <BlockStack gap="4">
                      <Text as="h2" variant="headingMd">
                        Add New Carrier
                      </Text>

                      <FormLayout>
                        <FormLayout.Group>
                          <TextField
                            label="Carrier Name"
                            value={newCarrier.name}
                            onChange={handleNameChange}
                            autoComplete="off"
                            placeholder="e.g., DHL, FedEx, UPS"
                          />
                          <TextField
                            label="Price per Parcel (in €)"
                            value={newCarrier.price}
                            onChange={handlePriceChange}
                            autoComplete="off"
                            placeholder="10.00"
                            prefix="€"
                            type="text"
                            helpText="Price in euros per parcel (without VAT)"
                          />
                        </FormLayout.Group>
                        <Button primary onClick={handleAddCarrier}>
                          Add Carrier
                        </Button>
                      </FormLayout>
                    </BlockStack>
                  </Box>
                </BlockStack>
              </Card>
            </Layout.Section>

            <Layout.Section>
              <Card>
                <BlockStack gap="4">
                  <Box padding="4">
                    <Text as="h2" variant="headingMd">
                      Configured Carriers
                    </Text>
                  </Box>
                  
                  <ResourceList
                    items={carriers}
                    renderItem={(carrier) => {
                      const { name, price } = carrier;
                      const isEditing = editCarrier && editCarrier.name === name;

                      return (
                        <ResourceItem id={name}>
                          <Box padding="4">
                            {isEditing ? (
                              <BlockStack gap="4">
                                <FormLayout>
                                  <FormLayout.Group>
                                    <TextField
                                      label="Carrier Name"
                                      value={editCarrier.name}
                                      onChange={handleEditNameChange}
                                      disabled
                                    />
                                    <TextField
                                      label="Price per Parcel (in €)"
                                      value={editCarrier.price}
                                      onChange={handleEditPriceChange}
                                      prefix="€"
                                      type="text"
                                    />
                                  </FormLayout.Group>
                                  <ButtonGroup>
                                    <Button primary onClick={handleUpdateCarrier}>
                                      Save
                                    </Button>
                                    <Button onClick={() => setEditCarrier(null)}>
                                      Cancel
                                    </Button>
                                  </ButtonGroup>
                                </FormLayout>
                              </BlockStack>
                            ) : (
                              <InlineStack align="space-between">
                                <BlockStack gap="1">
                                  <Text variant="headingSm" as="h3">
                                    {name}
                                  </Text>
                                  <Text variant="bodyMd" as="p">
                                    {formatPrice(price)} per parcel
                                  </Text>
                                </BlockStack>
                                <ButtonGroup>
                                  <Button
                                    icon={<Icon source={EditIcon} />}
                                    onClick={() => setEditCarrier({ name, price: price.toString() })}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    icon={<Icon source={DeleteIcon} />}
                                    onClick={() => confirmDelete(carrier)}
                                    destructive
                                  >
                                    Delete
                                  </Button>
                                </ButtonGroup>
                              </InlineStack>
                            )}
                          </Box>
                        </ResourceItem>
                      );
                    }}
                    emptyState={
                      <Box padding="4">
                        <BlockStack gap="2" alignment="center">
                          <Text as="p" variant="bodyMd">
                            No carriers configured yet. Add your first carrier above.
                          </Text>
                        </BlockStack>
                      </Box>
                    }
                  />
                </BlockStack>
              </Card>
            </Layout.Section>

            <Layout.Section>
              <Card>
                <BlockStack gap="4">
                  <Box padding="4">
                    <BlockStack gap="2">
                      <Text as="h2" variant="headingMd">
                        How the calculator works
                      </Text>
                      <Text as="p" variant="bodyMd">
                        Our rule-based shipping calculator:
                      </Text>
                      <ul style={{ listStyleType: "disc", paddingLeft: "20px" }}>
                        <li>
                          <Text as="span" variant="bodyMd">
                            Analyzes the total weight of the order
                          </Text>
                        </li>
                        <li>
                          <Text as="span" variant="bodyMd">
                            Calculates how many parcels are needed (max 31.5kg per parcel)
                          </Text>
                        </li>
                        <li>
                          <Text as="span" variant="bodyMd">
                            Multiplies the number of parcels by each carrier's per-parcel price
                          </Text>
                        </li>
                        <li>
                          <Text as="span" variant="bodyMd">
                            Automatically shows the customer the cheapest shipping option at checkout
                          </Text>
                        </li>
                      </ul>
                    </BlockStack>
                  </Box>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        </BlockStack>
      </Page>

      {/* Delete confirmation modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={`Delete ${carrierToDelete?.name}`}
        primaryAction={{
          content: "Delete",
          onAction: handleDeleteCarrier,
          destructive: true,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setDeleteModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <Text as="p">
            Are you sure you want to delete the carrier "{carrierToDelete?.name}"? This action cannot be undone.
          </Text>
        </Modal.Section>
      </Modal>
    </Frame>
  );
}