'use strict';

var yunba_demo;

var CHATROOM_TOPIC = 'CHATROOM_DEMO_V2';

var userList = [],
    numUsers = 1,
    username = '';

function initialize() {
    initYunbaSDK();
    initChatroomEvent();
}

// 初始化 Yunba SDK 并连接到服务器
function initYunbaSDK() {
    logMessage('正在初始化...');
    $('#chatroom-input').attr('disabled', true);
    $('#btn-send-msg').attr('disabled', true);
    yunba_demo.init(function (success) {
        if (success) {
            logMessage('初始化成功...');
            connect();
        } else {
            logMessage('初始化失败或服务断线，若长时间无响应请尝试刷新页面');
            connect();
        }
    }, function () {
        logMessage('服务断线，正在尝试重新连接...');
        sendState('OFFLINE');
        connect();
    });
}

// 输出提示信息
function logMessage(data) {
    addMessageElement({log: data}, true);
}

// 初始化聊天室事件
function initChatroomEvent() {

    // 发送消息
    $('#btn-send-msg').click(function () {
        sendMessage();
    });

    $('#chatroom-input').keydown(function (event) {
        sendMessageOnEnter(event)
    });
}

// 连接服务器
function connect() {
    logMessage('正在尝试连接...');
    yunba_demo.connect(function (success, msg) {
        if (success) {
            logMessage('连接成功...');
            setMessageCallback();
            setAlias(function () {
                subscribe(CHATROOM_TOPIC);
            });
        } else {
            logMessage(msg);
        }
    });
}

// 设置别名
function setAlias(callback) {
    var alias = 'Visitor' + Math.floor(Math.random() * 100000);

    yunba_demo.get_alias(function (data) {
        if (!data.alias) {
            yunba_demo.set_alias({'alias': alias}, function (data) {
                if (!data.success) {
                    console.log(data.msg);
                } else {
                    username = alias;
                }

                callback && callback();
            });
        } else {
            username = data.alias;
            callback && callback();
        }
    });


}

// 订阅消息
function subscribe(topic) {
    logMessage('正在尝试加入房间...');
    yunba_demo.subscribe({'topic': topic}, function (success, msg) {
        if (success) {
            yunba_demo.subscribe_presence({'topic': topic}, function (success, msg) {
                if (success) {
                    logMessage('加入房间成功...');
                    getOnlineUsers();
                    $('#chatroom-input').attr('disabled', false);
                    $('#btn-send-msg').attr('disabled', false);
                } else {
                    logMessage(msg);
                }
            });
        } else {
            logMessage(msg);
        }
    });
}

// 取得在线用户
function getOnlineUsers() {
    yunba_demo.get_alias_list(CHATROOM_TOPIC, function (success, data) {

        var index = 0,
            length = data.alias.length;

        var getState = function (callback) {
            var alias = data.alias[index];
            yunba_demo.get_state(alias, function (data) {
                if (data.success) {
                    addOnlineUserElement(alias);
                    callback && callback();
                }
            });
        };

        var cb = function () {
            if (index < length) {
                index++;
                getState(cb);
            }
        };

        getState(cb);
    });
}


// 发送消息
function sendMessage() {
    if ('' === $('#chatroom-input').val()) {
        return;
    }

    var data = JSON.stringify({
        dataType: 'MESSAGE',
        dataContent: $('#chatroom-input').val(),
        username: username
    });
    publish(CHATROOM_TOPIC, data);
    $('#chatroom-input').val('');
}

// 按回车发送消息
function sendMessageOnEnter(event) {
    if (event.keyCode === 13) {
        event.preventDefault();
    } else {
        return;
    }

    if ($(event.target).attr('id') === 'chatroom-input') {
        sendMessage();
    }
}

// 发布消息
function publish(topic, message) {
    yunba_demo.publish({'topic': topic, 'msg': message}, function (success, msg) {
        if (success) {
            console.log('消息发布成功');
        } else {
            logMessage(msg);
        }
    });
}

// 设置接收到 message 的回调处理方法
function setMessageCallback() {
    yunba_demo.set_message_cb(function (data) {
        if (data.presence) {
            var presence = data.presence,
                alias = presence.alias;
            if (presence.action == 'online') {
                addOnlineUserElement(alias);
            } else if (presence.action == 'offline') {
                removeOnlineUserElement(alias);
            }
        } else {
            dataController(data.msg);
        }
    });
}

// 接收到消息后处理消息内容
function dataController(data) {
    data = JSON.parse(data);
    if ('MESSAGE' === data.dataType) {
        addMessageElement(data);
    } else {
        console.log('发生错误...');
    }
}

// 在线用户列表中添加一个元素
function addOnlineUserElement(username) {
    if (-1 === userList.indexOf(username)) {
        userList.push(username);
        numUsers = userList.length;
        var $chatOnlineList = $('#chat-online-list');
        var $userListItem = $('<li class="list-group-item"/>').text(username);
        $userListItem.attr('id', username);

        $chatOnlineList.append($userListItem);
    }
}

// 在线用户列表中移除一个元素
function removeOnlineUserElement(username) {
    var indexOf = userList.indexOf(username);
    if (-1 != indexOf) {
        userList.splice(indexOf, 1);
        numUsers = userList.length;
        $('li[id="' + username + '"]').remove();
    }
}

// 在聊天框中输出一条信息
function addMessageElement(data, isLog) {
    var $chatMessages = $('#chat-messages');
    if (isLog) {
        $chatMessages.append($('<li />').addClass('chat-log').text(data.log));
        $chatMessages.scrollTop($chatMessages[0].scrollHeight); // 滚动到最底部
        return;
    }

    var $usernameSpan = $('<span class="chat-username"/>').text(data.username);
    var $messageBodySpan = $('<span class="chat-message-body"/>').text(data.dataContent);
    var $messageLi = $('<li class="chat-message"/>').append($usernameSpan, $messageBodySpan);

    $chatMessages.append($messageLi);
    $chatMessages.scrollTop($chatMessages[0].scrollHeight);
}

$(document).ready(function () {
    yunba_demo = new Yunba({
        appkey: '5487f75052be1f7e1dd834e8'
    });

    initialize();
});
