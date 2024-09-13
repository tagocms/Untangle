function itemListener(event) 
    {
        var trigger = event.srcElement;
        id = parseInt(trigger.id);
        var item = {};
        var tags = [];
        for (let i = 0; i < itemsData.length; i++)
        {
            if (itemsData[i]["id"] == id)
            {
                item = itemsData[i];
            }
        }

        for (let i = 0; i < tagsData.length; i++)
        {
            if (tagsData[i]["item_id"] == id)
            {
                tags.push(tagsData[i]["tag"]);
            }
        }

        document.querySelector("#item_title_display").innerHTML = item.title;
        document.querySelector("#item_title_display").classList.add("webapp-item-title");

        document.querySelector("#item_header_display").classList.add("webapp-item-header");

        document.querySelector("#item_tags_display").innerHTML = "Tags:";
        document.querySelector("#item_tags_display").classList.add("webapp-item-tags");

        let ul = document.createElement("ul");
        ul.classList.add("webapp-item-tags-ul")
        for (let i = 0; i < tags.length; i++)
        {
            let li = document.createElement("li");
            li.textContent = "#" + tags[i];
            li.classList.add("webapp-item-tags-li")
            ul.appendChild(li);
        }


        if (item.item_type == "task")
        {
            let input = document.createElement("input");
            input.classList.add("form-check-input", "webapp-task-p" + String(item.item_priority));
            input.setAttribute("type", "checkbox");
            input.setAttribute("id", "check-item");
            document.querySelector("#item_check_display").classList.add("check-display-border");
            if (!document.querySelector("#check-item"))
            {
                document.querySelector("#item_check_display").appendChild(input);
            }
            else
            {
                document.querySelector("#item_check_display").replaceChild(input, document.querySelector("#check-item"));
            }
        }
        if (item.item_type == "note" && document.querySelector("#check-item"))
        {
            document.querySelector("#item_check_display").removeChild(document.querySelector("#check-item"));
        }

        document.querySelector("#item_tags_display").appendChild(ul);
        if (!item.deadline)
        {
            document.querySelector("#item_deadline_display").innerHTML = "Add Date";
        }
        else
        {
            document.querySelector("#item_deadline_display").innerHTML = item.deadline;
        }
        document.querySelector("#item_deadline_display").classList.add("deadline-display");
        document.querySelector("#item_priority_display").innerHTML = "Priority: " + item.item_priority;
        document.querySelector("#item_priority_display").classList.add("priority-display");

        let textareaBody = document.createElement("textarea");
        if (!document.querySelector(".webapp-textarea-body"))
        {
            textareaBody.classList.add("webapp-textarea-body");
            textareaBody.setAttribute("rows", "35")
            document.querySelector("#item_body_display").appendChild(textareaBody);
        }
        document.querySelector(".webapp-textarea-body").innerHTML = item.body;
    }