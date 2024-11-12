import React, { useState, useContext } from "react";
import "./Booking.css";
import { Form, FormGroup, ListGroup, Button, ListGroupItem, Alert } from "reactstrap";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { BASE_URL } from "../../utils/config";
import { loadStripe } from "@stripe/stripe-js"; // Import loadStripe

// Load your Stripe publishable key
const stripePromise = loadStripe("pk_test_51QBJKjKjAvLaXa5B4eke3J5OywxNqu5exQhxhYQ4Ood098CHKgOFMJTp4cuxBG1bQVoiIeznmgjwWtpAAr0GdWHr00kc7rWEIN"); // Replace with your actual publishable key

const Booking = ({ tour, avgRating, totalRating, reviews }) => {
  const { price, title } = tour;
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [booking, setBooking] = useState({
    userId: user && user.username,
    userEmail: user && user.email,
    tourName: title,
    fullName: "",
    phone: "",
    bookAt: "",
    groupSize: 1, // Default value of 1 person
  });

  const [isBookingSuccessful, setIsBookingSuccessful] = useState(false);
  const [isBookingFailed, setIsBookingFailed] = useState(false);
  const [isLoginAlertVisible, setIsLoginAlertVisible] = useState(false);

  // Handle form field changes
  const handleChange = (e) => {
    setBooking((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  // Handle form submission and Stripe Checkout initiation
  const handleClick = async (e) => {
    e.preventDefault();
    try {
      if (!user) {
        setIsLoginAlertVisible(true);
        return;
      }

      // Save the booking data to the backend
      const response = await fetch(`${BASE_URL}/booking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(booking),
      });

      if (!response.ok) {
        setIsBookingSuccessful(false);
        setIsBookingFailed(true);
        return;
      }

      const bookingData = await response.json(); // Parse the booking data
      setIsBookingSuccessful(true);
      setIsBookingFailed(false);

      // Clear the booking form after successful submission
      setBooking({
        ...booking,
        fullName: "",
        phone: "",
        bookAt: "",
        groupSize: 1, // Reset group size to default
      });

      // Get Stripe instance
      const stripe = await stripePromise;

      // Create checkout session by calling the backend
      const checkoutSessionResponse = await fetch(`${BASE_URL}/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: (price * (booking.groupSize || 1)).toFixed(2), // Calculate total amount in USD
          tourName: title,
          userId: user.username, // Assuming `username` is the user ID
        }),
      });

      if (!checkoutSessionResponse.ok) {
        throw new Error("Failed to create Stripe session");
      }

      const session = await checkoutSessionResponse.json();

      // Redirect to Stripe Checkout
      const result = await stripe.redirectToCheckout({
        sessionId: session.id, // Pass sessionId to Stripe
      });

      if (result.error) {
        console.error(result.error.message);
      }
    } catch (error) {
      setIsBookingSuccessful(false);
      setIsBookingFailed(true);
      console.error("Booking or Payment failed", error);
    }
  };

  const currentDate = new Date().toISOString().split("T")[0];

  // Calculate taxes and total
  const taxes = (0.05 * price * (booking.groupSize || 1)).toFixed(2);
  const total = (price * (booking.groupSize || 1) * 1.05).toFixed(2);

  return (
    <div className="booking">
      {isBookingSuccessful && (
        <Alert color="success">Booking Successful</Alert>
      )}

      {isBookingFailed && (
        <Alert color="danger">Failed to book. Please try again.</Alert>
      )}

      {isLoginAlertVisible && (
        <Alert color="warning">Please login to proceed with the booking.</Alert>
      )}

      <div className="booking__top d-flex align-items-center justify-content-between">
        <h3>
          ${price} <span>/Per Person</span>
        </h3>
        <span className="tour__rating d-flex align-items-center gap-1">
          <i className="ri-star-fill"></i>
          {avgRating === 0 ? null : avgRating}
          {totalRating === 0 ? (
            <span>Not Rated</span>
          ) : (
            <span>({reviews.length || 0})</span>
          )}
        </span>
      </div>

      <div className="booking__form">
        <h5>Information</h5>
        <Form className="booking__info-form" onSubmit={handleClick}>
          <FormGroup>
            <input
              type="text"
              placeholder="Full Name"
              id="fullName"
              required
              onChange={handleChange}
              value={booking.fullName}
            />
          </FormGroup>
          <FormGroup>
            <input
              type="number"
              placeholder="Phone"
              id="phone"
              required
              onChange={handleChange}
              value={booking.phone}
            />
          </FormGroup>
          <FormGroup className="d-flex align-items-center gap-3">
            <input
              type="date"
              placeholder="Date"
              id="bookAt"
              required
              onChange={handleChange}
              value={booking.bookAt}
              min={currentDate} // Set minimum date to the current date
            />
            <input
              type="number"
              placeholder="Group Size"
              id="groupSize"
              required
              onChange={handleChange}
              value={booking.groupSize}
              min="1" // Minimum group size is 1 person
            />
          </FormGroup>
          <Button className="btn primary__btn w-100 mt-4" type="submit">
            Book Now
          </Button>
        </Form>
      </div>

      <div className="booking__bottom">
        <ListGroup>
          <ListGroupItem className="border-0 px-0">
            <h5 className="d-flex align-items-center gap-1">
              ${price} <i className="ri-close-line"></i> {booking.groupSize || 1} person(s)
            </h5>
            <span>${price * (booking.groupSize || 1)}</span>
          </ListGroupItem>
          <ListGroupItem className="border-0 px-0">
            <h5>Service charge</h5>
            <span>${taxes}</span>
          </ListGroupItem>
          <ListGroupItem className="border-0 px-0 total">
            <h5>Total</h5>
            <span>${total}</span>
          </ListGroupItem>
        </ListGroup>
      </div>
    </div>
  );
};

export default Booking;
