VAR sought_explanation = false
-> END

=== arrival ===
Welcome to the site. The university needs its first service online. We have an empty hall and a delivery waiting. Let’s trace what one rack needs before we promise anything bigger.
-> END

=== survey ===
I’m Mara, the facilities lead. The shell, permits, and incoming utility connection are ready. Today, you own the handover. Start with the delivery pallet outside the hall.
+ [Why start with an inspection?]
  ~ sought_explanation = true
  Before installation, check what arrived and what it needs. A delivery record is evidence of receipt, not evidence of a working service.
  -> END
+ [Give me a hint]
  Select “Delivery apron” in the scene, or use “Find the delivery.” Then inspect the pallet.
  -> END

=== placement ===
One rack, three possible bays. The west bay is nearer the electrical room; the east bay is nearer the network room. Compare the routes before you commit.
+ [Why do routes matter?]
  ~ sought_explanation = true
  The equipment is identical. The lengths of its connections are not. In this exercise, those lengths affect the connection cost. Keep access space clear for installation and maintenance.
  -> END
+ [Give me a hint]
  Select Bay A, B, or C. Your inspection panel shows every route and its cost. Confirm when you’re ready.
  -> END

=== power ===
The rack is installed, but it is not connected. Start at the electrical room and follow the path all the way to your bay.
+ [Why is the rack still offline?]
  ~ sought_explanation = true
  Owning equipment does not create a service. We need an available power source, distribution, cooling, and connectivity. We will verify those dependencies before admitting a client.
  -> END
+ [Give me a hint]
  Select the electrical room and connect its circuit. The amber line will show the route to the rack you placed.
  -> END

=== cooling ===
Now give the heat somewhere to go. Connect the cooling plant to the rack. A completed pipe route is only the beginning—we’ll test how the system responds.
+ [Why can’t the room cool itself?]
  ~ sought_explanation = true
  IT equipment releases heat as it works. Cooling moves that heat through a system to the environment. Installing extra servers without a working heat-removal path makes the problem worse.
  -> END
+ [Give me a hint]
  Select the cooling plant, then connect the cooling circuit. Watch the blue route reach your bay.
  -> END

=== network ===
Power and cooling are connected. Now complete the network path. The university needs a reliable connection, not just a rack with blinking lights.
+ [Is more bandwidth always better?]
  ~ sought_explanation = true
  Bandwidth helps only if the route is available. Later, we’ll inspect whether apparently separate services share a physical corridor. For now, connect this first tested link.
  -> END
+ [Give me a hint]
  Select the network exchange and connect the fiber route. Our teaching workload needs 100 Mbps of the link’s illustrative 1,000 Mbps capacity.
  -> END

=== commissioning ===
Everything looks connected. That is exactly when we test. We’ll apply a controlled load while the university remains disconnected. Watch the cooling response.
+ [What are we checking?]
  ~ sought_explanation = true
  We’re checking the connected system under an illustrative 6 kW IT load: electrical availability, heat removal, and network readiness. These checks are one simplified part of commissioning.
  -> END
+ [Give me a hint]
  Select the rack and run the commissioning test. A failed check is useful information before a client depends on us.
  -> END

=== fault ===
There it is. The cooling circuit exists, but its control is in manual standby. The test stopped before customer handover. Let’s correct the control, not buy another rack.
+ [How did a connected system fail?]
  ~ sought_explanation = true
  A physical connection does not guarantee the right response. The cooling capacity exists, but the controller did not call for it. This is why commissioning tests behavior, not just an equipment list.
  -> END
+ [Give me a hint]
  Select the cooling control panel. Change it to automatic response, then repeat the same test.
  -> END

=== retest ===
The control is corrected. Now prove it. Run the same acceptance test again and check that cooling follows the load.
+ [Why run the same test?]
  ~ sought_explanation = true
  Repeating the test checks whether the correction resolved the failure. Changing the test would make the before-and-after comparison less useful.
  -> END
+ [Give me a hint]
  Select the rack and run the commissioning test again. Passing the checks unlocks the customer handover.
  -> END

=== handover ===
All three paths passed. The cooling plant responded to the test load. You can now connect the university’s teaching service.
+ [What happens at handover?]
  ~ sought_explanation = true
  The service changes from a controlled exercise to a real responsibility within our fictional campus. Its workload now depends on the systems you just verified.
  -> END
+ [Give me a hint]
  Select the rack and choose “Bring service online.” The client confirmation is your first operational milestone.
  -> END

=== reflection ===
The university is online. Before we look ahead, tell me what kept the hall from opening. The useful lesson is the cause, not the color of the alarm.
+ [Help me reason it through]
  ~ sought_explanation = true
  We had a rack, electrical capacity, a network link, and a connected cooling plant. Which system failed to respond when we tested them together?
  -> END

=== expansion ===
Ishan in procurement has a new request: a second hall for the next term. The supplier warns that a fictional export review may delay new shipments. Your working rack is unaffected. What should we prepare before promising a date?
+ [What makes this geopolitical?]
  ~ sought_explanation = true
  A policy decision outside our site changes access to future equipment. Our response is about dependencies, timing, and options. We cannot make the policy disappear by paying an emergency fee.
  -> END
+ [What should I compare?]
  ~ sought_explanation = true
  Compare an achievable phased launch, a qualified alternative, and an early promise made before dependencies are confirmed. This choice records your intention for the next chapter; no shipment dates are known yet.
  -> END

=== complete ===
{sought_explanation:
You kept asking what sat behind each step. Keep that habit. A facility becomes dependable when someone follows its dependencies all the way through.
- else:
You traced the connections, found the fault, and tested the correction. One hall is ready. Keep asking what each new promise will depend on.
}
-> END
