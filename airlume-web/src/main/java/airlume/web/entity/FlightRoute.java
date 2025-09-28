/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package airlume.web.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.io.Serializable;

/**
 *
 * @author Tisha
 */
@Entity
@Table(name = "flight_routes")
public class FlightRoute implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;
    
    @NotNull
    @Size(min=3 , max= 4 )
    private String origin ; 
    
    @NotNull 
    @Size(min= 3 , max = 4 )
    private String destination ; 
    
    //constructor
    public FlightRoute(){}
    
    public FlightRoute(String origin , String destination){
        this.origin = origin;
        this.destination = destination ; 
    }
   
    @Override
    public String toString() {
        return "airlume.web.entity.FlightRoute[ id=" + id + " ]";
    }
    
    //Getters and setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }
    
    public String getOrigin(){
        return origin ; 
    }
    public void setOrigin(String origin){
        this.origin = origin; 
    }
     public String getDestination(){
        return origin ; 
    }
    public void setDestination(String destination){
        this.destination = destination; 
    }
    
}
