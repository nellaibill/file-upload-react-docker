# Use an official lightweight Python image as the base
FROM python:3.11-slim

WORKDIR /app

# Copy the simulation script into the container
COPY simulate_browser.py ./

# Install any needed packages (add more if needed)
RUN pip install boto3

CMD ["python", "simulate_browser.py"]
