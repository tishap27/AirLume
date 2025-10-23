package airlume.web.entity;

public class Waypoint {
    private int number;
    private double latitude;
    private double longitude;
    private double distanceKm;
    private double riskPercent;
    private String riskLevel;
    
    public Waypoint() {}
    
    public Waypoint(int number, double latitude, double longitude, double distanceKm, double riskPercent, String riskLevel) {
        this.number = number;
        this.latitude = latitude;
        this.longitude = longitude;
        this.distanceKm = distanceKm;
        this.riskPercent = riskPercent;
        this.riskLevel = riskLevel;
    }
    
    // Getters and Setters
    public int getNumber() { return number; }
    public void setNumber(int number) { this.number = number; }
    
    public double getLatitude() { return latitude; }
    public void setLatitude(double latitude) { this.latitude = latitude; }
    
    public double getLongitude() { return longitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }
    
    public double getDistanceKm() { return distanceKm; }
    public void setDistanceKm(double distanceKm) { this.distanceKm = distanceKm; }
    
    public double getRiskPercent() { return riskPercent; }
    public void setRiskPercent(double riskPercent) { this.riskPercent = riskPercent; }
    
    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }
    
    public String getRiskClass() {
        if (riskLevel == null) return "low";
        switch (riskLevel.toUpperCase()) {
            case "LOW": return "low";
            case "MODERATE": return "moderate";
            case "HIGH": return "high";
            case "CRITICAL": return "critical";
            default: return "low";
        }
    }
    
    public String getRiskColor() {
        switch (getRiskClass()) {
            case "low": return "#27ae60";
            case "moderate": return "#f39c12";
            case "high": return "#e67e22";
            case "critical": return "#e74c3c";
            default: return "#27ae60";
        }
    }
    
    public double getPositionPercent() {
        // This will be calculated based on total distance
        return 0.0;
    }
}